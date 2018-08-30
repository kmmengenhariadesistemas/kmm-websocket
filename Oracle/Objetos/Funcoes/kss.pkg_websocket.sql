create or replace package kss.pkg_websocket is

  -- Author  : CRISTOFER
  -- Created : 12/9/2017 12:03:47
  -- Purpose : 
  
function fnc_comunica_api
(p_context  varchar2
,p_method   varchar2
,p_body     xmltype
,p_timeout  integer := null
) return xmltype;

procedure prc_send_message
(p_room        in  varchar2
,p_message     in  xmltype
);


end pkg_websocket;
/
create or replace package body kss.pkg_websocket is

function fnc_comunica_api
(p_context  varchar2
,p_method   varchar2
,p_body     xmltype
,p_timeout  integer := null
) return xmltype
as
v_body    clob;
v_servidor varchar2(4000);
http_req  utl_http.req;
http_resp utl_http.resp;
v_request clob;
v_buffer  varchar2(4000);
v_offset  number := 1;
v_err_msg varchar2(4000);
v_calculated_length integer := 0;
v_status  integer;
v_host    varchar2(4000);
begin
   v_host := kss.pkg_parametro.fnc_valor_string(p_identificador => 'M011-P0001');
   v_servidor := rtrim(v_host,'/') || p_context;
   dbms_lob.createtemporary(v_request,true);
   select xmlserialize(document p_body as clob no indent)
     into v_body
     from dual; 
      
   begin
      -- Inicializa a conexão http
      utl_http.set_body_charset(charset => 'UTF-8');
      if p_timeout is null then
         utl_http.set_transfer_timeout(30);
      else
         utl_http.set_transfer_timeout(p_timeout);
      end if;

      http_req := utl_http.begin_request(v_servidor, p_method, 'HTTP/1.1');
      utl_http.set_header(http_req, 'Content-Type', 'application/xml');

      -- Calcula o tamanho do conteúdo para enviar no cabecalho. Length padrão traz um tamanho inválido.
      declare
      v_texto varchar2(4000);
      begin
         v_offset := 1;
         while v_offset <= dbms_lob.getlength(v_body) loop
            v_texto := dbms_lob.substr(v_body,4000,v_offset);
            v_calculated_length := v_calculated_length + utl_raw.length(utl_raw.convert(utl_raw.cast_to_raw(v_texto),'american_america.al32utf8','ENGLISH_UNITED KINGDOM.WE8ISO8859P15'));
            v_offset := v_offset + 4000;
         end loop;
         utl_http.set_header(http_req, 'Content-Length', v_calculated_length);
      end;

      -- Envia os dados para o sefazProxy
      declare
      v_texto varchar2(4000);
      begin
         v_offset := 1;
         while v_offset <= dbms_lob.getlength(v_body) loop
            v_texto := dbms_lob.substr(v_body,4000,v_offset);
            utl_http.write_text(http_req, v_texto);
            v_offset := v_offset + 4000;
         end loop;
      end;
      http_resp := utl_http.get_response(http_req);
      v_status := http_resp.status_code;
      begin
         loop
            utl_http.read_text(r    => http_resp,
                               data => v_buffer );
            v_request :=  v_request || v_buffer;
         end loop;
      exception
         when utl_http.end_of_body then
           null;
      end;
      
      utl_http.end_response(http_resp);
   exception
      when others then
         v_err_msg := substr(sqlerrm,10,4000);
         begin
            utl_http.end_response(http_resp);
         exception
           when others then 
              null;
         end;
         raise_application_error(-20000, 'Problemas de comunicação com o WebSocket: ' || chr(13) || chr(10) ||
                                         'Erro: ' || v_err_msg );
   end;
   
   if v_status = 404 then
      raise_application_error(-20000, v_request); 
   end if;

   return xmltype.createxml(v_request);
   
end;

procedure prc_send_message
(p_room        in  varchar2
,p_message     in  xmltype
) as
v_result   xmltype;
v_send     xmltype;
v_status   varchar2(4000);
v_message  varchar2(4000);
begin
   select xmlelement("params", 
             xmlattributes('object' as "type"), 
             xmlelement("room", xmlattributes('string' as "type"), stringtojson(p_room)),
             xmlelement("emit", xmlattributes('string' as "type"), stringtojson('message')),
             xmlelement("message", 
                xmlattributes('object' as "type"), 
                p_message
             ) 
          ) 
     into v_send
     from dual;
     
   v_result := fnc_comunica_api(p_context => '/send'
                               ,p_method  => 'POST'
                               ,p_body    => v_send
                               );
                               
   select extractvalue(v_result, '/params/status')
        , extractvalue(v_result, '/params/message')
     into v_status
        , v_message
     from dual;
   
   if v_status <> 'OK' then
      raise_application_error(-20000, v_message);      
   end if;
end;

end pkg_websocket;
/
