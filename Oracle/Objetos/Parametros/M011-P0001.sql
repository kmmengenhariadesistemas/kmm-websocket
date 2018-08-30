declare
v_cod_parametro integer;
v_count         integer;
begin

   begin
      select p.cod_parametro
        into v_cod_parametro
        from kss.v$parametro p
       where p.identificador = 'M011-P0001';

      update kss.v$parametro p
         set p.parametro_grupo_id = 55
           , p.descricao          = 'URL para envio de mensagens nos canais do WebSocket'
           , p.parametro_tipo_id  = 3
           , p.permite_editar     = 1
           , p.finalidade         = 'URL para envio de mensagens nos canais do WebSocket'
           , p.onde_usado         = 'WebSocket'
       where p.cod_parametro = v_cod_parametro;
   exception
      when no_data_found then
         insert into kss.v$parametro(identificador, parametro_grupo_id, descricao, parametro_tipo_id, permite_editar, finalidade, onde_usado)
         values ('M011-P0001', 55, 'URL para envio de mensagens nos canais do WebSocket', 3, 1, 'URL para envio de mensagens nos canais do WebSocket', 'WebSocket')
         returning cod_parametro into v_cod_parametro;
   end;

   for i in (
      select g.cod_gestao
        from kss.pessoa_aplicacao_gestao g
       where exists (select 0
                       from kss.pessoa_unidade_negocio u
                      where u.cod_gestao = g.cod_gestao)
       order by cod_gestao
   )loop
      delete from kss.pessoa_usuario_acesso_cur;
      insert into kss.pessoa_usuario_acesso_cur(cod_pessoa, usuario)
         select cod_pessoa, 'x'
           from kss.pessoa_unidade_negocio
          where cod_gestao = i.cod_gestao;

      select count(1)
        into v_count
        from kss.v$parametro_valor pv
       where pv.cod_parametro = v_cod_parametro;

      if (v_count = 0) then
         kss.pkg_parametro.prc_ins_parametro_valor(p_cod_parametro => v_cod_parametro
                                                  ,p_valor         => 'http://localhost:4327/');
      end if;

   end loop;

   commit;
end;
/
